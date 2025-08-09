import React from 'react';
import { Alert } from 'react-bootstrap';

interface Props {
  messages: string[];
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onClose?: () => void;
}

const ValidationMessages: React.FC<Props> = ({ messages, variant = 'danger', onClose }) => {
  if (!messages || messages.length === 0) return null;
  return (
    <Alert variant={variant} dismissible={!!onClose} onClose={onClose} className="py-2">
      {messages.length === 1 ? (
        <span>{messages[0]}</span>
      ) : (
        <ul className="mb-0">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
};

export default ValidationMessages;
