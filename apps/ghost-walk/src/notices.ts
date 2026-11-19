/** A clock reading such as "6:10 PM" in the walker's own time zone. */
export function localTime(time: number): string {
  return new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** What a walker reads on reaching a sunset-wake stop in daylight. */
export function sleepingNotice(name: string, wakesAt: number | null, format: (time: number) => string = localTime): string {
  if (wakesAt === null) return `${name} is still asleep until sunset. Read it from the list now.`;
  return `${name} is still asleep. It wakes at sunset, ${format(wakesAt)}. Come back then, or read it from the list now.`;
}
