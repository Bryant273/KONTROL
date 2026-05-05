import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './frontend/App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error("GLOBAL ERROR DETECTED:", event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("!!! UNHANDLED REJECTION DETECTED !!!");
  console.error("Reason Object:", event.reason);
  
  const reason = event.reason;
  const isError = reason instanceof Error;
  const type = typeof reason;

  console.log(`- Type: ${type}`);
  if (isError) {
    console.log(`- Name: ${reason.name}`);
    console.log(`- Message: ${reason.message || '(empty)'}`);
    console.log(`- Stack: ${reason.stack}`);
  }

  if (type === 'object' && reason !== null) {
    try {
      const json = JSON.stringify(reason, null, 2);
      console.log("- JSON Detail:", json);
      // If it looks like our custom firestore error, try to parse the message
      if (isError && reason.message) {
        try {
          const inner = JSON.parse(reason.message);
          console.table(inner);
        } catch (e) {}
      }
    } catch (e) {
      console.log("- (Could not stringify reason)");
    }
  } else {
    console.log("- Value:", String(reason));
  }
});

console.log("[KONTROL] System Boot Initiated...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("ROOT ELEMENT NOT FOUND!");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
