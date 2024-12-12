export interface ChatMessage {
  text: string;
  emoji?: string;
  highlight?: boolean;
}

export interface ChatGreetingProps {
  messages?: ChatMessage[];
}

export interface ChatHeaderProps {
  avatarSrc: string;
  name: string;
  role: string;
}

export interface ChatInterfaceProps {
  initialMessages?: ChatMessage[];
}

export interface BackgroundProps {
  className?: string;
}

export interface ChatMessageProps {
  messages: string[];
  colorClasses?: string[];
}