import { redirect } from 'next/navigation';

// /matches has been merged into the home page. Redirect for backwards
// compatibility with any links that were shared before the merge.
export default function MatchesRedirect() {
  redirect('/');
}
