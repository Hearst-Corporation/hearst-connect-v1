/**
 * Screen-reader twin of a chart — the visual canvas is `aria-hidden`, so this
 * table is the data. One shared structure: row label first, then value cells.
 */
export function ChartAccessibilityTable({
  caption,
  columns,
  rows,
  footer,
}: Readonly<{
  caption: string
  /** First column names the row dimension (Date, Scenario…), the rest are values. */
  columns: readonly string[]
  rows: readonly { readonly key: string; readonly label: string; readonly cells: readonly string[] }[]
  /** Optional totals row (part-to-whole charts) — rendered as `tfoot`. */
  footer?: { readonly label: string; readonly cells: readonly string[] }
}>) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {row.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? (
          <tfoot>
            <tr>
              <th scope="row">{footer.label}</th>
              {footer.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
