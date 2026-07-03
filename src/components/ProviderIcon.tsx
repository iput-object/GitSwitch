import { GithubLogo } from "@phosphor-icons/react";
import { GitlabIcon, BitbucketIcon } from "./icons/ProviderIcons";

/** The glyph for a provider kind. Self-hosted/custom kinds reuse their base
 *  kind's icon; anything unknown falls back to the GitHub mark. */
export function ProviderIcon({
  kind,
  size = 14,
  className,
}: {
  kind: string;
  size?: number;
  className?: string;
}) {
  if (kind === "gitlab")
    return <GitlabIcon width={size} height={size} className={className} />;
  if (kind === "bitbucket")
    return <BitbucketIcon width={size} height={size} className={className} />;
  return <GithubLogo size={size} weight="fill" className={className} />;
}
