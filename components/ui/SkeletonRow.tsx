export default function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="skeleton h-3.5 rounded"
            style={{ width: i === 0 ? '60%' : i === cols - 1 ? '40%' : '70%' }}
          />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonRows({ count = 8, cols = 5 }: { count?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  )
}
