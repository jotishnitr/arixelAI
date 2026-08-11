import Sidebar from "../components/Sidebar";
import Chatarea from "../components/Chatarea"
import { useState } from "react";
export default function Homepage() {
  const [context, setContext] = useState("");
  const [currentState, setCurrentState] = useState("hero");

  return (
    <>
      <Sidebar context={context} setContext={setContext} currentState={currentState} setCurrentState={setCurrentState} />
      <Chatarea context={context} setContext={setContext} currentState={currentState} setCurrentState={setCurrentState} />
    </>
  );
}
