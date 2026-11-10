import Navbar from "../components/Navbar";
import MapaRed from "../components/MapaRed";

function Dashboard() {
  return (
    <div>
      <Navbar />
      <div style={{ padding: "1rem" }}>
        <h2>Panel principal</h2>
        <MapaRed />
      </div>
    </div>
  );
}

export default Dashboard;