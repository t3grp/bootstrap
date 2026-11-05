"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Blocks,
  Check,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import type { WorkspaceSnapshot } from "@bootstrap/core";
import {
  ApiError,
  getSetupStatus,
  getWorkspace,
  setup,
  signIn,
} from "@/lib/api";
import { WorkspaceApp } from "@/components/workspace/workspace-app";
import styles from "./gateway.module.css";

type Screen = "loading" | "setup" | "sign-in" | "unavailable";

export function AppGateway() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [requiresToken, setRequiresToken] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerCreated, setOwnerCreated] = useState(false);

  const openWorkspace = useCallback(async () => {
    const requested = window.location.pathname.match(/^\/w\/([^/]+)/)?.[1];
    const data = await getWorkspace(
      requested ? decodeURIComponent(requested) : undefined,
    );
    setSnapshot(data);
  }, []);

  const initialize = useCallback(async () => {
    setScreen("loading");
    setError("");
    try {
      const status = await getSetupStatus();
      setRequiresToken(status.requiresSetupToken);
      if (!status.initialized) {
        setScreen("setup");
        return;
      }
      try {
        await openWorkspace();
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401)
          setScreen("sign-in");
        else throw cause;
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reach your workspace.",
      );
      setScreen("unavailable");
    }
  }, [openWorkspace]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") || "").trim();
    const password = String(fields.get("password") || "");
    try {
      if (screen === "setup" && !ownerCreated) {
        await setup({
          name: String(fields.get("name") || "").trim(),
          email,
          password,
          workspaceName: String(fields.get("workspaceName") || "").trim(),
          setupToken: String(fields.get("setupToken") || ""),
        });
        setOwnerCreated(true);
      }
      await signIn(email, password);
      await openWorkspace();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (snapshot) return <WorkspaceApp initialSnapshot={snapshot} />;
  const creating = screen === "setup";
  return (
    <main className={styles.gateway}>
      <a className={styles.brand} href="/" aria-label="Bootstrap home">
        <span>
          <Blocks size={21} strokeWidth={1.8} />
        </span>
        Bootstrap
      </a>
      <section className={styles.story} aria-label="About your workspace">
        <span className={styles.eyebrow}>
          A LITTLE STRUCTURE. MORE POSSIBILITY.
        </span>
        <h1>
          Your next chapter
          <br />
          starts here.
        </h1>
        <p>A home for your ideas, your work, and the team you’re building.</p>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.previewTop}>
            <span className={styles.dot} />
            <span>My workspace</span>
            <span className={styles.previewTag}>YOUR SPACE TO BUILD</span>
          </div>
          <div className={styles.previewBody}>
            <span className={styles.pageIcon}>✳</span>
            <h2>Make something that matters.</h2>
            <div className={styles.previewRule} />
            <div className={styles.previewRuleShort} />
            <div className={styles.previewTask}>
              <span>
                <Check size={12} />
              </span>
              A place for every idea
            </div>
            <div className={styles.previewTask}>
              <span>
                <Check size={12} />
              </span>
              A clear next step
            </div>
            <div className={styles.previewTask}>
              <span />
              <span>Room to grow</span>
            </div>
          </div>
        </div>
        <footer>Open source. Built for people who build.</footer>
      </section>
      <section className={styles.formSide}>
        {screen === "loading" ? (
          <div className={styles.loading} role="status">
            <LoaderCircle className={styles.spinner} size={24} />
            <p>Opening your workspace…</p>
          </div>
        ) : screen === "unavailable" ? (
          <div className={styles.formWrap}>
            <span className={styles.eyebrow}>LET’S TRY THAT AGAIN</span>
            <h2>Your workspace is out of reach.</h2>
            <p className={styles.description}>{error}</p>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void initialize()}
            >
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        ) : (
          <div className={styles.formWrap}>
            <span className={styles.eyebrow}>
              {creating ? "WELCOME TO BOOTSTRAP" : "GOOD TO SEE YOU"}
            </span>
            <h2>
              {creating
                ? "Make it your workspace."
                : "Pick up where you left off."}
            </h2>
            <p className={styles.description}>
              {creating
                ? "Create the owner account for this instance. Your pages, files, and tasks will live here."
                : "Sign in to your Bootstrap workspace."}
            </p>
            <form onSubmit={submit} className={styles.form}>
              {creating && (
                <>
                  <label>
                    Your name
                    <input
                      name="name"
                      autoComplete="name"
                      placeholder="Alex Morgan"
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Workspace name
                    <input
                      name="workspaceName"
                      autoComplete="organization"
                      placeholder="My company"
                      required
                      maxLength={100}
                    />
                  </label>
                </>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={creating ? "new-password" : "current-password"}
                  placeholder={
                    creating ? "At least 12 characters" : "Your password"
                  }
                  minLength={creating ? 12 : undefined}
                  maxLength={128}
                  required
                />
              </label>
              {creating && requiresToken && (
                <label>
                  Setup token
                  <input
                    name="setupToken"
                    type="password"
                    autoComplete="off"
                    placeholder="From your server configuration"
                    required
                  />
                  <small>
                    The deployment owner sets this token to protect first-time
                    setup.
                  </small>
                </label>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button className={styles.primary} type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <LoaderCircle size={16} className={styles.spinner} />
                    {creating ? "Creating your workspace…" : "Signing in…"}
                  </>
                ) : (
                  <>
                    {creating ? "Create workspace" : "Sign in"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
            <p className={styles.note}>
              {creating
                ? "Your workspace works without AI keys or connected services."
                : "This instance is managed by its owner. New account registration is closed."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
