export default function shortenRealmId(value: string): string {
  if (value.length > 8) {
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  return value;
}
