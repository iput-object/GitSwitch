import githubImg from "../assets/github-dark.png";
import gitlabImg from "../assets/gitlab-dark.png";
import bitbucketImg from "../assets/bitbucket-dark.png";

/** The glyph for a provider kind. Self-hosted/custom kinds reuse their base
 *  kind's icon; anything unknown falls back to the GitHub mark. */
export function ProviderIcon({
  kind,
  size = 14,
  className = "",
}: {
  kind: string;
  size?: number;
  className?: string;
}) {
  let src = githubImg;
  if (kind === "gitlab") src = gitlabImg;
  else if (kind === "bitbucket") src = bitbucketImg;

  return (
    <img 
      src={src} 
      alt={kind} 
      width={size} 
      height={size} 
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
