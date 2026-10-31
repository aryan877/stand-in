import {
  createToolkitAuthPlugin,
  renderAuthPage,
} from "@agent-native/toolkit/app/auth/server";

const SIGN_IN_STYLES = `<style>
.auth-marketing-home .app-status-badge,
.auth-marketing-home .marketing-actions,
.auth-marketing-home .app-name img.brand-mark { display: none; }
@media not all and (min-width: 901px) {
  .auth-marketing-home .marketing-panel { display: block; }
  .auth-marketing-home .auth-marketing-visual,
  .auth-marketing-home .auth-marketing-visual .marketing-content { min-height: 0; }
  .auth-marketing-home .auth-marketing-visual { padding: 0 1.25rem 2.5rem; text-align: center; }
  .auth-marketing-home .app-name,
  .auth-marketing-home .auth-marketing-description { display: none; }
  .auth-marketing-home .auth-marketing-headline { font-size: 1.125rem; line-height: 1.4; margin: 0; }
  html body.has-marketing .auth-marketing-visual,
  html body.has-marketing .marketing-panel { background: #ffffff; }
}
html body.has-marketing {
  --auth-marketing-left-bg: #fafafa;
  --auth-marketing-right-bg: #ffffff;
  --auth-marketing-foreground: #141414;
  --auth-marketing-muted: #616161;
  --auth-marketing-subtle: #7a7a7a;
  --auth-marketing-border: #ebebeb;
  --auth-marketing-badge-bg: #f5f5f5;
  color-scheme: light;
  background: #ffffff;
  color: #141414;
}
html body.has-marketing .auth-page { --auth-wave-bg: #ffffff; --auth-wave-fg: #ffffff; --b-bg-page: #ffffff; background: #ffffff; }
html body.has-marketing canvas { display: none; }
@media (min-width: 901px) {
  html body.has-marketing .auth-marketing-visual,
  html body.has-marketing .marketing-panel { background: #fafafa; }
}
html body.has-marketing .form-panel { background: #ffffff; }
html body.has-marketing .card,
html body.has-marketing .card h1,
html body.has-marketing .auth-marketing-headline,
html body.has-marketing .app-name { color: #141414; }
html body.has-marketing .card .subtitle,
html body.has-marketing .auth-marketing-description,
html body.has-marketing label { color: #616161; }
html body.has-marketing .tabs { background: #f5f5f5; }
html body.has-marketing .tab { color: #616161; }
html body.has-marketing .tab.active { background: #ffffff; color: #141414; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
html body.has-marketing .tab:hover:not(.active) { color: #141414; }
html body.has-marketing .card input { color: #141414; border-color: #e0e0e0; background: #ffffff; }
html body.has-marketing .card input:focus { border-color: #8a8a8a; box-shadow: 0 0 0 1px rgba(0,0,0,0.08); }
html body.has-marketing .card input::placeholder { color: #8a8a8a; opacity: 1; }
html body.has-marketing .card button[type="submit"],
html body.has-marketing .card .btn-primary { background: #141414; color: #ffffff; border: 1px solid #141414; }
html body.has-marketing .card button[type="submit"]:hover,
html body.has-marketing .card .btn-primary:hover { background: #2e2e2e; }
</style>`;

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  publicPaths: ["/"],
  rootAuth: false,
  marketing: {
    appName: "Stand-in",
    tagline: "An AI that attends your Google Meet when you can't.",
    description:
      "It says it's an AI, reads out only the answers you prepared, and you get the notes when the call ends.",
  },
  renderSignInPage: (props) => `${SIGN_IN_STYLES}${renderAuthPage(props)}`,
});
