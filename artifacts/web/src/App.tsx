import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { SessionProvider } from "./store/SessionContext";
import { Layout } from "./components/Layout";
import Landing from "./pages/Landing";
import TrackSearch from "./pages/TrackSearch";
import ListenMode from "./pages/ListenMode";
import PracticeMode from "./pages/PracticeMode";
import Recap from "./pages/Recap";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/track" component={TrackSearch} />
        <Route path="/listen" component={ListenMode} />
        <Route path="/practice" component={PracticeMode} />
        <Route path="/recap" component={Recap} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
