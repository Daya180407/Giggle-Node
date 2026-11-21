export default function PostBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return (
    <div className="prose-blog max-w-none text-[15px]">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("## ")) {
          return <h2 key={i}>{trimmed.replace(/^##\s*/, "")}</h2>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={i}>{trimmed.replace(/^#\s*/, "")}</h2>;
        }
        if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i}>
              {trimmed.split("\n").map((line, j) => (
                <li key={j}>{line.replace(/^-\s*/, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}
