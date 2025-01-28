declare module 'react-markdown' {
  import React from 'react';

  export interface ReactMarkdownProps {
    children: string;
    className?: string;
    components?: {
      [key: string]: React.ComponentType<any>;
    };
  }

  const ReactMarkdown: React.FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

interface CodeProps {
  node: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'react-markdown': ReactMarkdownProps;
    }
  }
}