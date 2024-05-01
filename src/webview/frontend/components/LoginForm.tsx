import {
  VSCodeButton,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react/index.js';
import React, { useEffect, useState } from 'react';
import useWarning from '../hooks/useWarning.js';

const LoginForm = ({
  vscode,
}: {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { Warning, setWarning } = useWarning();

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as {
        command: string;
        error: { message: string } | null;
      };

      if (message.command === 'login-submitted') {
        if (message.error !== null) {
          setWarning(message.error.message, true);
        }

        setIsSubmitting(false);
      }
    });
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const get = (name: string) =>
      (event.currentTarget.elements.namedItem(name) as HTMLInputElement).value;

    const credentials = {
      ip: get('ip'),
      username: get('username'),
      password: get('password'),
      expireAt: Date.now() + 1000 * 60 * 60 * 6 /* TTL */,
    };

    if (Object.values(credentials).some((c) => c === '')) {
      setWarning('All fields are required.', true);
      return;
    }

    setIsSubmitting(true);

    vscode.postMessage({
      command: 'submit-login',
      credentials,
    });
  }

  return (
    <div id="login">
      <form onSubmit={handleSubmit} className={isSubmitting ? 'disabled' : ''}>
        <VSCodeTextField name="ip" disabled={isSubmitting}>
          IP
        </VSCodeTextField>

        <VSCodeTextField name="username" disabled={isSubmitting}>
          Username
        </VSCodeTextField>

        <VSCodeTextField
          name="password"
          type="password"
          disabled={isSubmitting}
        >
          Password
        </VSCodeTextField>

        <VSCodeButton type="submit" disabled={isSubmitting}>
          Log in
        </VSCodeButton>
      </form>

      <Warning />
    </div>
  );
};

export default LoginForm;
