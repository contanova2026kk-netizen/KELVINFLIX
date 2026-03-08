export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  fontStyle: string;
}

export interface Friend {
  id: string;
  username: string;
  avatar: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  hasPassword: boolean;
  users: { id: string; username: string; avatar?: string }[];
  videoUrl: string;
}
