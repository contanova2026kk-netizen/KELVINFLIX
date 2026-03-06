import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("kevinflix.db");
db.pragma("journal_mode = WAL");

// Setup Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    avatar TEXT,
    font_style TEXT
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id TEXT,
    friend_id TEXT,
    status TEXT DEFAULT 'accepted',
    PRIMARY KEY (user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    video_url TEXT,
    thumbnail TEXT,
    duration TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

interface RoomState {
  id: string;
  name: string;
  password?: string;
  videoUrl: string;
  playing: boolean;
  currentTime: number;
  messages: Message[];
  drawings: DrawingLine[];
  activeDrawers: Set<string>;
  users: Set<{ id: string; username: string; avatar?: string }>;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  avatar?: string;
}

interface DrawingLine {
  id: string;
  points: number[];
  color: string;
  brushSize: number;
}

const rooms = new Map<string, RoomState>();

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/rooms", (req, res) => {
    const activeRooms = Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      hasPassword: !!room.password,
      users: Array.from(room.users),
      videoUrl: room.videoUrl
    }));
    res.json(activeRooms);
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("register-user", ({ username, avatar, fontStyle }) => {
      try {
        const stmt = db.prepare("INSERT OR REPLACE INTO users (id, username, avatar, font_style) VALUES (?, ?, ?, ?)");
        stmt.run(socket.id, username, avatar, fontStyle);
        socket.emit("user-registered", { id: socket.id, username });
      } catch (err) {
        console.error("Error registering user:", err);
      }
    });

    socket.on("get-friends", (username) => {
      const stmt = db.prepare(`
        SELECT u.username, u.avatar, u.font_style 
        FROM users u 
        JOIN friends f ON u.id = f.friend_id 
        WHERE f.user_id = (SELECT id FROM users WHERE username = ?)
      `);
      const friends = stmt.all(username);
      socket.emit("friends-list", friends);
    });

    socket.on("add-friend", ({ myUsername, friendUsername }) => {
      try {
        const userStmt = db.prepare("SELECT id FROM users WHERE username = ?");
        const me = userStmt.get(myUsername) as any;
        const friend = userStmt.get(friendUsername) as any;

        if (me && friend) {
          const addStmt = db.prepare("INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)");
          addStmt.run(me.id, friend.id);
          addStmt.run(friend.id, me.id); // Mutual for now
          socket.emit("friend-added", { success: true, friendUsername });
        } else {
          socket.emit("friend-added", { success: false, message: "Usuário não encontrado" });
        }
      } catch (err) {
        socket.emit("friend-added", { success: false, message: "Erro ao adicionar amigo" });
      }
    });

    socket.on("get-my-movies", (username) => {
      const stmt = db.prepare("SELECT * FROM movies WHERE user_id = (SELECT id FROM users WHERE username = ?) ORDER BY added_at DESC");
      const movies = stmt.all(username);
      socket.emit("my-movies-list", movies);
    });

    socket.on("add-movie", ({ username, movie }) => {
      try {
        const userStmt = db.prepare("SELECT id FROM users WHERE username = ?");
        const user = userStmt.get(username) as any;
        if (user) {
          const stmt = db.prepare("INSERT INTO movies (id, user_id, title, video_url, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)");
          stmt.run(uuidv4(), user.id, movie.title, movie.videoUrl, movie.thumbnail, movie.duration);
          socket.emit("movie-added", { success: true });
        }
      } catch (err) {
        socket.emit("movie-added", { success: false });
      }
    });

    socket.on("create-room", ({ roomId, name, password, username, avatar }) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          name: name || `Sala de ${username}`,
          password,
          videoUrl: "",
          playing: false,
          currentTime: 0,
          messages: [],
          drawings: [],
          activeDrawers: new Set(),
          users: new Set()
        });
      }
      socket.emit("room-created", roomId);
      io.emit("rooms-updated");
    });

    socket.on("check-password", ({ roomId, password }, callback) => {
      const room = rooms.get(roomId);
      if (!room) {
        callback({ success: false, message: "Sala não encontrada" });
        return;
      }
      if (room.users.size >= 6) {
        callback({ success: false, message: "A sala está cheia (limite de 6 pessoas)" });
        return;
      }
      if (room.password && room.password !== password) {
        callback({ success: false, message: "Senha incorreta" });
        return;
      }
      callback({ success: true });
    });

    socket.on("join-room", ({ roomId, username, avatar, password }) => {
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit("error", "Sala não encontrada");
        return;
      }

      if (room.users.size >= 6) {
        socket.emit("error", "A sala está cheia (limite de 6 pessoas)");
        return;
      }

      if (room.password && room.password !== password) {
        socket.emit("error", "Senha incorreta");
        return;
      }

      socket.join(roomId);
      
      const user = { id: socket.id, username, avatar };
      room.users.add(user);
      io.emit("rooms-updated");
      
      // Send current state to the new user
      socket.emit("room-state", {
        videoUrl: room.videoUrl,
        playing: room.playing,
        currentTime: room.currentTime,
        messages: room.messages,
        drawings: room.drawings,
        activeDrawers: Array.from(room.activeDrawers),
        users: Array.from(room.users)
      });
      
      // Notify others
      socket.to(roomId).emit("user-joined", user);
      socket.to(roomId).emit("users-updated", Array.from(room.users));
      
      // Video sync
      socket.on("video-url", (url) => {
        room.videoUrl = url;
        io.to(roomId).emit("video-url", url);
        io.emit("rooms-updated");
      });
      
      socket.on("video-play", (time) => {
        room.playing = true;
        room.currentTime = time;
        socket.to(roomId).emit("video-play", time);
      });
      
      socket.on("video-pause", (time) => {
        room.playing = false;
        room.currentTime = time;
        socket.to(roomId).emit("video-pause", time);
      });
      
      socket.on("video-seek", (time) => {
        room.currentTime = time;
        socket.to(roomId).emit("video-seek", time);
      });
      
      // Chat
      socket.on("send-message", (text) => {
        const msg: Message = {
          id: uuidv4(),
          userId: socket.id,
          username,
          avatar,
          text,
          timestamp: Date.now()
        };
        room.messages.push(msg);
        io.to(roomId).emit("new-message", msg);
      });
      
      // Drawing
      socket.on("draw-line", (line: DrawingLine) => {
        room.drawings.push(line);
        socket.to(roomId).emit("draw-line", line);
      });
      
      socket.on("clear-drawing", () => {
        room.drawings = [];
        io.to(roomId).emit("clear-drawing");
      });
      
      socket.on("start-drawing", () => {
        room.activeDrawers.add(username);
        io.to(roomId).emit("active-drawers", Array.from(room.activeDrawers));
      });
      
      socket.on("stop-drawing", () => {
        room.activeDrawers.delete(username);
        io.to(roomId).emit("active-drawers", Array.from(room.activeDrawers));
      });
      
      socket.on("disconnect", () => {
        room.activeDrawers.delete(username);
        room.users.delete(user);
        
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("active-drawers", Array.from(room.activeDrawers));
          socket.to(roomId).emit("user-left", user);
          socket.to(roomId).emit("users-updated", Array.from(room.users));
        }
        io.emit("rooms-updated");
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
