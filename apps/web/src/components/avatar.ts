/** First letter of a name for the round avatar, ignoring the "Dr." title. */
export function initial(name: string): string {
  return name.replace('Dr. ', '').replace('د. ', '').trim().charAt(0);
}
