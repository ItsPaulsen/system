// Rows and columns of data. Wraps the native table in .table-wrap so wide tables scroll.
// Children are the usual thead/tbody markup; props pass through to the table.
export default function Table({ children, className, ...rest }) {
  return (
    <div className="table-wrap">
      <table className={["table", className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </table>
    </div>
  );
}
