import React from "react";

const RenderIf = ({
  condition,
  children,
}: {
  condition: boolean;
  children: React.ReactNode;
}) => {
  return <>{condition ? children : null}</>;
};

export default RenderIf;
