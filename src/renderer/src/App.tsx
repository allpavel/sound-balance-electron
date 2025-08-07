import { AppShell, Button } from "@mantine/core";

function App(): React.JSX.Element {
  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{ breakpoint: "sm", width: 150 }}
    >
      <AppShell.Header>Menu</AppShell.Header>
      <AppShell.Navbar>Collections</AppShell.Navbar>
      <AppShell.Main>
        <Button onClick={() => window.api.showDialog()}>Open</Button>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
