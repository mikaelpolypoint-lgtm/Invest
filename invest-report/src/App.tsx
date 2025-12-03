import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import InitiativePlanner from './InitiativePlanner';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planning" element={<InitiativePlanner />} />
      </Routes>
    </Layout>
  );
}

export default App;
