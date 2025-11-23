import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

function Reportes() {
    const [resumen, setResumen] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartDataFinan, setChartDataFinan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportError, setExportError] = useState(null);

    const { currentUser } = useAuth();
    const chartLineRef = useRef(null);
    const chartDoughnutRef = useRef(null);
    const chartFinanRef = useRef(null);

    useEffect(() => {
        const fetchReportes = async () => {
            if (!currentUser) return;
            setLoading(true); setError(null);
            try {
                const token = await currentUser.getIdToken();
                const headers = { headers: { Authorization: `Bearer ${token}` } };
                const [resumenRes, graficasCitasRes, financieroRes] = await Promise.all([
                    axios.get('/api/reportes/resumen-citas', headers),
                    axios.get('/api/reportes/graficas-citas', headers),
                    axios.get('/api/reportes/financiero', headers)
                ]);
                setResumen(resumenRes.data);
                setChartData(graficasCitasRes.data);
                setChartDataFinan(financieroRes.data);
            } catch (err) { setError('Error al cargar reportes.'); }
            setLoading(false);
        };
        fetchReportes();
    }, [currentUser]);

    const handleExportCSV = async () => {
        setExportLoading(true); setExportError(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get('/api/reportes/exportar-citas', { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url; link.setAttribute('download', 'reporte-citas.csv');
            document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
            setExportLoading(false);
        } catch (err) { setExportLoading(false); setExportError('Error al exportar CSV.'); }
    };

    const handleExportPDF = () => {
        setExportLoading(true); setExportError(null);
        setTimeout(async () => {
            try {
                const token = await currentUser.getIdToken();
                const response = await axios.get('/api/reportes/exportar-citas', { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
                const csvText = await response.data.text();
                const lines = csvText.split('\n');
                const tableHeader = lines[0].split(',');
                const tableBody = lines.slice(1).map(line => line.split(','));

                const lineChart = chartLineRef.current;
                const doughnutChart = chartDoughnutRef.current;
                const finanChart = chartFinanRef.current;

                if (!lineChart?.chart || !doughnutChart?.chart || !finanChart?.chart) throw new Error("Gráficas no listas.");

                const lineChartImage = lineChart.chart.canvas.toDataURL('image/png', 1.0);
                const doughnutChartImage = doughnutChart.chart.canvas.toDataURL('image/png', 1.0);
                const finanChartImage = finanChart.chart.canvas.toDataURL('image/png', 1.0);

                const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
                doc.setFontSize(20);
                doc.text('Reporte General - Clínica Ricardo Palma', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

                doc.setFontSize(14);
                doc.text('Tendencia de Citas (Últimos 6 Meses)', 40, 80);
                doc.addImage(lineChartImage, 'PNG', 40, 90, 300, 150);
                doc.text('Citas por Especialidad', 380, 80);
                doc.addImage(doughnutChartImage, 'PNG', 380, 90, 200, 200);

                doc.addPage();
                doc.text('Evolución de Ingresos (Últimos 6 Meses)', 40, 40);
                doc.addImage(finanChartImage, 'PNG', 40, 50, 300, 150);

                doc.setFontSize(16);
                doc.text('Detalle de Citas Registradas', 40, 230);
                autoTable(doc, { startY: 240, head: [tableHeader], body: tableBody, theme: 'striped', styles: { fontSize: 8 } });

                doc.save('reporte-clinica-ricardo-palma.pdf');
            } catch (err) { setExportError('Error al generar PDF.'); console.error(err); }
            setExportLoading(false);
        }, 0);
    };

    const dataEspecialidades = {
        labels: chartData ? Object.keys(chartData.porEspecialidad) : [],
        datasets: [{ label: '# Citas', data: chartData ? Object.values(chartData.porEspecialidad) : [], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }],
    };
    const dataTendencia = {
        labels: chartData ? Object.keys(chartData.tendenciaMensual) : [],
        datasets: [{ label: 'Citas', data: chartData ? Object.values(chartData.tendenciaMensual) : [], fill: true, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.3 }],
    };
    const dataEvolucionIngresos = {
        labels: chartDataFinan ? Object.keys(chartDataFinan.evolucionMensual) : [],
        datasets: [{ label: 'Ingresos (S/)', data: chartDataFinan ? Object.values(chartDataFinan.evolucionMensual) : [], fill: true, borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.3 }],
    };

    return (
        <div className="panel-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="panel-title" style={{ border: 'none', margin: 0 }}>Reportes y Estadísticas</h3>
                <div>
                    <button onClick={handleExportCSV} disabled={exportLoading} className="btn btn-outline btn-sm">CSV</button>
                    <button onClick={handleExportPDF} disabled={exportLoading} className="btn btn-primary btn-sm">PDF</button>
                </div>
            </div>

            {error && <p className="message-box message-error">{error}</p>}
            {exportError && <p className="message-box message-error">{exportError}</p>}

            {loading ? <p>Cargando...</p> : (resumen && chartData && chartDataFinan && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-blue)' }}>{resumen.total}</div>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>Total Citas</div>
                        </div>
                        <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#856404' }}>{resumen.reservada}</div>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>Pendientes</div>
                        </div>
                        <div style={{ background: '#d4edda', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#155724' }}>{resumen.completada}</div>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>Completadas</div>
                        </div>
                        <div style={{ background: '#d1ecf1', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0c5460' }}>S/ {chartDataFinan.ingresosHoy}</div>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666' }}>Ingresos Hoy</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                        <div style={{ flex: '1 1 300px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                            <h5 style={{ textAlign: 'center', color: '#555', marginBottom: '15px' }}>Por Especialidad</h5>
                            <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                                <Doughnut ref={chartDoughnutRef} data={dataEspecialidades} />
                            </div>
                        </div>
                        <div style={{ flex: '1 1 400px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                            <h5 style={{ textAlign: 'center', color: '#555', marginBottom: '15px' }}>Tendencia de Citas</h5>
                            <div style={{ height: '300px' }}>
                                <Line ref={chartLineRef} data={dataTendencia} options={{ maintainAspectRatio: false }} />
                            </div>
                        </div>
                        <div style={{ flex: '1 1 100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                            <h5 style={{ textAlign: 'center', color: '#555', marginBottom: '15px' }}>Evolución de Ingresos</h5>
                            <div style={{ height: '300px' }}>
                                <Line ref={chartFinanRef} data={dataEvolucionIngresos} options={{ maintainAspectRatio: false }} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
export default Reportes;