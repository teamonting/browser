export default function delta<T>(left: Set<T>, right: Set<T>): readonly [Set<T>, Set<T>, Set<T>] {
  const common = left.intersection(right);
  const leftOnly = left.difference(common);
  const rightOnly = right.difference(common);

  if (leftOnly.size + common.size !== left.size) {
    throw new Error('Internal error: wrong leftOnly or common');
  } else if (rightOnly.size + common.size !== right.size) {
    throw new Error('Internal error: wrong rightOnly or common');
  }

  return Object.freeze([leftOnly, common, rightOnly]);
}
