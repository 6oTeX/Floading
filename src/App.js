import React, { useState } from 'react';
import Papa from 'papaparse';
import { Line, Bar } from 'react-chartjs-2';

import 'chartjs-adapter-date-fns';
import { parse, isValid } from 'date-fns';
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  TimeScale,
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

function App() {
  const [datasets, setDatasets] = useState({});
  const [barDatasets, setBarDatasets] = useState({});
  const [pagination, setPagination] = useState({});
  const itemsPerPage = 10; // Aantal datasets per pagina

  // State voor totale resultaten
  const [totalDatasets, setTotalDatasets] = useState({});
  const [totalBarData, setTotalBarData] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data;
          console.log('Geparste data:', parsedData);
          processData(parsedData);
        },
      });
    }
  };

  const parseDate = (dateString) => {
    const formats = ['M/d/yyyy H:mm', 'yyyy-MM-dd HH:mm:ss'];
    for (const format of formats) {
      const parsedDate = parse(dateString, format, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    console.error('Ongeldige datum na parsen:', dateString);
    return null;
  };

  const processData = (data) => {
    const statusData = {};
    const statusCountsPerCity = {};
    const cities = new Set();

    // Variabelen voor totale data
    const totalStatusData = {};
    const totalStatusCounts = {};

    data.forEach((row) => {
      console.log('Huidige rij:', row);

      if (!row.Timestamp || !row.Charging_Status) {
        console.warn('Ontbrekende gegevens in rij:', row);
        return;
      }

      const timestampStr = row.Timestamp.toString().trim();
      const statusStr = row.Charging_Status.toString().trim();

      const timestamp = parseDate(timestampStr);
      if (!timestamp) {
        return;
      }

      const city = row.Location.trim();
      cities.add(city);

      const charger = `${city} - ${row.Charger_ID.trim()} - ${row.Connector_ID.trim()}`;
      const status = statusStr;

      // Debugging
      console.log('Timestamp:', timestamp);
      console.log('Status:', status);

      // Data voor lijn grafieken per stad
      if (!statusData[city]) {
        statusData[city] = {};
      }

      if (!statusData[city][charger]) {
        statusData[city][charger] = [];
      }

      statusData[city][charger].push({
        x: timestamp,
        y: getStatusValue(status),
      });

      // Data voor staafdiagrammen per stad
      if (!statusCountsPerCity[city]) {
        statusCountsPerCity[city] = {};
      }

      if (!statusCountsPerCity[city][status]) {
        statusCountsPerCity[city][status] = 0;
      }

      statusCountsPerCity[city][status]++;

      // Data voor totale lijn grafiek
      const totalCharger = 'Alle Laders';
      if (!totalStatusData[totalCharger]) {
        totalStatusData[totalCharger] = [];
      }
      totalStatusData[totalCharger].push({
        x: timestamp,
        y: getStatusValue(status),
      });

      // Data voor totale staafdiagram
      if (!totalStatusCounts[status]) {
        totalStatusCounts[status] = 0;
      }
      totalStatusCounts[status]++;
    });

    console.log('StatusData:', statusData);
    console.log('StatusCountsPerCity:', statusCountsPerCity);

    // Maak datasets voor lijn grafieken per stad
    const cityDatasets = {};

    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

    for (const city of cities) {
      const chargers = statusData[city];
      const datasetsArray = [];
      let colorIndex = 0;

      for (const charger in chargers) {
        datasetsArray.push({
          label: charger,
          data: chargers[charger].sort((a, b) => a.x - b.x),
          borderColor: colors[colorIndex % colors.length],
          backgroundColor: colors[colorIndex % colors.length],
          fill: false,
          stepped: true,
        });
        colorIndex++;
      }

      cityDatasets[city] = {
        datasets: datasetsArray,
        totalDatasets: datasetsArray.length,
      };
    }

    setDatasets(cityDatasets);

    // Maak datasets voor staafdiagrammen per stad
    const barDatasets = {};

    for (const city in statusCountsPerCity) {
      const statuses = statusCountsPerCity[city];
      const data = [];

      for (const status in statuses) {
        data.push({
          label: status,
          count: statuses[status],
        });
      }

      barDatasets[city] = data;
    }

    setBarDatasets(barDatasets);

    // Maak datasets voor totale lijn grafiek
    const totalDatasetsArray = [];
    let colorIndex = 0;

    for (const charger in totalStatusData) {
      totalDatasetsArray.push({
        label: charger,
        data: totalStatusData[charger].sort((a, b) => a.x - b.x),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length],
        fill: false,
        stepped: true,
      });
      colorIndex++;
    }

    const totalCityDatasets = {
      datasets: totalDatasetsArray,
      totalDatasets: totalDatasetsArray.length,
    };

    setTotalDatasets(totalCityDatasets);

    // Maak data voor totale staafdiagram
    const totalBarDataArray = [];
    for (const status in totalStatusCounts) {
      totalBarDataArray.push({
        label: status,
        count: totalStatusCounts[status],
      });
    }

    setTotalBarData(totalBarDataArray);

    // Initialiseer paginering per stad
    const initialPagination = {};
    for (const city of Object.keys(cityDatasets)) {
      initialPagination[city] = 1;
    }
    setPagination(initialPagination);
  };

  const getStatusValue = (status) => {
    switch (status) {
      case 'Available':
        return 1;
      case 'Charging':
        return 2;
      case 'SuspendedEV':
      case 'Suspended EV':
        return 3;
      case 'Offline':
        return 0;
      default:
        console.warn('Onbekende status:', status);
        return -1;
    }
  };

  const getStatusLabel = (value) => {
    switch (value) {
      case 0:
        return 'Offline';
      case 1:
        return 'Available';
      case 2:
        return 'Charging';
      case 3:
        return 'SuspendedEV';
      default:
        return 'Onbekend';
    }
  };

  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          tooltipFormat: 'dd-MM-yyyy HH:mm',
          displayFormats: {
            hour: 'dd-MM HH:mm',
          },
        },
        title: {
          display: true,
          text: 'Tijd',
        },
      },
      y: {
        ticks: {
          callback: function (value) {
            return getStatusLabel(value);
          },
          stepSize: 1,
        },
        min: 0,
        max: 3,
        title: {
          display: true,
          text: 'Status',
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const status = getStatusLabel(context.parsed.y);
            return `${label}: ${status}`;
          },
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Status',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Aantal',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Visualisatie van Laderstatus</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />

      {/* Totale Resultaten */}
      {totalDatasets.datasets && totalDatasets.datasets.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2>Totale Resultaten</h2>
          <Line data={{ datasets: totalDatasets.datasets }} options={chartOptions} />
        </div>
      )}

      {totalBarData.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Totale Statusfrequentie</h3>
          <Bar
            data={{
              labels: totalBarData.map((item) => item.label),
              datasets: [
                {
                  label: 'Totale Statusfrequentie',
                  data: totalBarData.map((item) => item.count),
                  backgroundColor: '#FF6384',
                },
              ],
            }}
            options={barChartOptions}
          />
        </div>
      )}

      {/* Grafieken per stad */}
      {Object.keys(datasets).length > 0 &&
        Object.keys(datasets).map((city) => {
          const totalDatasets = datasets[city].totalDatasets;
          const totalPages = Math.ceil(totalDatasets / itemsPerPage);
          const currentPage = pagination[city] || 1;

          const indexOfLastItem = currentPage * itemsPerPage;
          const indexOfFirstItem = indexOfLastItem - itemsPerPage;
          const currentDatasets = datasets[city].datasets.slice(
            indexOfFirstItem,
            indexOfLastItem
          );

          return (
            <div key={city} style={{ marginTop: '40px' }}>
              <h2>{city}</h2>
              <Line data={{ datasets: currentDatasets }} options={chartOptions} />
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => setPagination({ ...pagination, [city]: 1 })}
                  disabled={currentPage === 1}
                >
                  Eerste
                </button>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, [city]: currentPage - 1 })
                  }
                  disabled={currentPage === 1}
                >
                  Vorige
                </button>
                <span>
                  Pagina {currentPage} van {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, [city]: currentPage + 1 })
                  }
                  disabled={currentPage === totalPages}
                >
                  Volgende
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, [city]: totalPages })}
                  disabled={currentPage === totalPages}
                >
                  Laatste
                </button>
              </div>
              {barDatasets[city] && (
                <div style={{ marginTop: '20px' }}>
                  <h3>Statusfrequentie in {city}</h3>
                  <Bar
                    data={{
                      labels: barDatasets[city].map((item) => item.label),
                      datasets: [
                        {
                          label: `Statusfrequentie in ${city}`,
                          data: barDatasets[city].map((item) => item.count),
                          backgroundColor: '#36A2EB',
                        },
                      ],
                    }}
                    options={barChartOptions}
                  />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

export default App;
