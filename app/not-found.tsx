import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>We couldn’t find that page.</h1>
      <p>Choose one of the 15 fictional profiles to continue.</p>
      <Link className="button" href="/candidates">
        Browse roommates
      </Link>
    </section>
  );
}
