import React from 'react';

export function Greeting({ name }: { name: string }) {
  return <div>Hello, {name}</div>;
}

const Button = (props: { label: string }) => {
  return <button>{props.label}</button>;
};

export default Button;
