export default function mapGetOrInsertComputed<K, V>(map: Map<K, V>, key: K, callback: () => V): V {
  let value: V | undefined = map.get(key);

  if (typeof value === 'undefined') {
    value = callback();
    map.set(key, value);
  }

  return value;
}
