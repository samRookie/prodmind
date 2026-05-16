import React, { useState } from 'react';

export interface CounterProps {
  initial: number;
}

export const Counter: React.FC<CounterProps> = ({ initial }) => {
  const [count, setCount] = useState(initial);
  return <div>{count}</div>;
};

export default Counter;
