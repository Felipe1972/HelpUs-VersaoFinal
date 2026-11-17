import { createContext, useContext, useState } from 'react';
const Context = createContext(null);
export function DemoProvider({ children }) {
  const [response, setResponse] = useState(null);
  const [read, setRead] = useState([]);
  function resetDemo() { setResponse(null); setRead([]); }
  return <Context.Provider value={{ response, setResponse, read, setRead, resetDemo }}>{children}</Context.Provider>;
}
export function useDemo() { return useContext(Context); }
