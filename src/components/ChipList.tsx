interface ChipListProps {
  items: readonly string[];
  /** Nome da lista pra leitores de tela, ex.: "Tecnologias". */
  label: string;
}

export function ChipList({ items, label }: ChipListProps) {
  return (
    <ul className="chips" aria-label={label}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
