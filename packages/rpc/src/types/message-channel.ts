export interface MessageChannel {
  subscribe: (callback: (message: unknown) => void) => () => void;
  publish: (message: unknown) => void;
}
