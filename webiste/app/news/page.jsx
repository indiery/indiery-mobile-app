import Image from "next/image";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { posts } from "../../lib/site-data";

export const metadata = {
  title: "Delivery & Moving Guides",
  description:
    "Practical Indiery guides for city delivery, business dispatch, and local shifting.",
};

export default function NewsPage() {
  return (
    <main>
      <SiteHeader active="news" />
      <section className="newsHero innerPageHero">
        <div className="shell">
          <h1>
            Plan a better delivery,
            <br />
            <span>dispatch or local move.</span>
          </h1>
          <p>
            Practical Indiery guides for choosing vehicles, preparing goods,
            and coordinating every trip.
          </p>
        </div>
      </section>
      <section className="section newsArchive">
        <div className="shell newsArchiveGrid">
          {Object.entries(posts).map(([slug, post]) => (
            <article key={slug}>
              <a href={`/post/${slug}`} className="archiveImage">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(max-width: 820px) 100vw, 33vw"
                />
              </a>
              <time>{post.date}</time>
              <h2>
                <a href={`/post/${slug}`}>{post.title}</a>
              </h2>
              <p>{post.intro}</p>
              <a className="readLink" href={`/post/${slug}`}>
                Read guide ↗
              </a>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
