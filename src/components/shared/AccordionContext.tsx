import React, { createContext, useContext, useState } from 'react';

interface AccordionContextType {
  preventToggle: () => void;
  allowToggle: () => void;
  canToggle: boolean;
}

const AccordionContext = createContext<AccordionContextType>({
  preventToggle: () => {},
  allowToggle: () => {},
  canToggle: true,
});

export const useAccordion = () => useContext(AccordionContext);

export const AccordionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [canToggle, setCanToggle] = useState(true);

  const preventToggle = () => setCanToggle(false);
  const allowToggle = () => setCanToggle(true);

  return (
    <AccordionContext.Provider value={{ preventToggle, allowToggle, canToggle }}>
      {children}
    </AccordionContext.Provider>
  );
};