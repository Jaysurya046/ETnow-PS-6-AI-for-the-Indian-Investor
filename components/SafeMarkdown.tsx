import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function SafeMarkdown({ children }: { children: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} skipHtml>{children}</ReactMarkdown>
    </div>
  );
}
