import React, { useEffect, useState } from 'react';

function useWarning() {
  const [warning, setWarningBase] = useState('');
  const [isError, setIsError] = useState(false);

  const setWarning = (warning: string, isError: boolean) => {
    // appending timestamp to force `useEffect` to run even if re-setting to the same warning
    // needed because user may submit again before previous warning is removed
    setWarningBase(warning === '' ? '' : warning + Date.now());

    setIsError(isError);
  };

  useEffect(() => {
    let id: NodeJS.Timeout;

    if (warning !== '') {
      id = setTimeout(() => {
        setWarning('', false);
      }, 10000);
    }

    return () => {
      clearTimeout(id);
    };
  }, [warning]);

  const Warning = () =>
    warning !== '' && (
      <div className="submit-warning">
        <span
          className={`codicon codicon-${isError ? 'error' : 'pass'}`}
        ></span>
        {warning.replace(/\d+$/, '')}
      </div>
    );

  return { Warning, setWarning };
}

export default useWarning;
