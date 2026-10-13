import Image from "next/image";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { posts } from "../../../lib/site-data";

export function generateStaticParams() { return Object.keys(posts).map((slug) => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = posts[slug];
  return { title: post?.title || "Indiery Guides", description: post?.intro };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) notFound();
  return <main><SiteHeader active="news" /><article className="postPage"><header className="shell postHeader"><time>{post.date}</time><h1>{post.title}</h1><p>{post.intro}</p></header><div className="shell postImage"><Image src={post.image} alt={post.title} fill priority sizes="100vw" /></div><div className="postBody">{post.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</div></article><section className="recentPosts section"><div className="shell"><div className="sectionIntro split"><h2>More practical guidance<br /><span>for your next move.</span></h2><a className="underLink" href="/news">View all guides</a></div></div></section><SiteFooter /></main>;
}
