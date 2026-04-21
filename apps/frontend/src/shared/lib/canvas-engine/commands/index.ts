export interface Command {
  id: string;
  label: string;
  do(): void;
  undo(): void;
}