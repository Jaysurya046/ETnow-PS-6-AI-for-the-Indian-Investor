import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Children, type ReactNode } from "react";

// Preserve safe text rendering while giving figures the same treatment as quote tables.
function numericText(children: ReactNode) {
  return Children.map(children, child => typeof child === "string"
    ? child.split(/([₹$]?[+-]?\d[\d,]*(?:\.\d+)?(?:%|Cr|L|K)?)/g).map((part, index) => index % 2
      ? <span className="numeric" key={index}>{part}</span> : part)
    : child);
}

export default function SafeMarkdown({ children }: { children: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} skipHtml components={{
        p: ({ children }) => <p>{numericText(children)}</p>,
        li: ({ children }) => <li>{numericText(children)}</li>,
        strong: ({ children }) => <strong>{numericText(children)}</strong>,
        em: ({ children }) => <em>{numericText(children)}</em>,
        h1: ({ children }) => <h1>{numericText(children)}</h1>,
        h2: ({ children }) => <h2>{numericText(children)}</h2>,
        h3: ({ children }) => <h3>{numericText(children)}</h3>,
      }}>{children}</ReactMarkdown>
    </div>
  );
}
