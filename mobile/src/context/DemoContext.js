import { createContext, useContext, useState } from 'react';
const Context = createContext(null);
export function DemoProvider({ children }) {
  const [favorite, setFavorite] = useState(false);
  const [response, setResponse] = useState(null);
  const [read, setRead] = useState([]);
  function resetDemo() { setFavorite(false); setResponse(null); setRead([]); }
  return <Context.Provider value={{ favorite, setFavorite, response, setResponse, read, setRead, resetDemo }}>{children}</Context.Provider>;
}
export function useDemo() { return useContext(Context); }
