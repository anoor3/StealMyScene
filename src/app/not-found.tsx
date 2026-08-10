import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state empty-state--page shell">
      <span aria-hidden="true">404</span>
      <h1>That scene left the stage.</h1>
      <p>The link may be old, or the scene is not published.</p>
      <Link className="button" href="/explore">Browse scenes</Link>
    </div>
  );
}
