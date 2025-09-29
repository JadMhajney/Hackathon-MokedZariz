import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import MapComponent from './MapComponent';
import '@fortawesome/fontawesome-free/css/all.min.css';

function DataTablePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:3002/uploads');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rawData = await response.json();
        console.log('=== DEBUG: Raw API Response ===');
        console.log('Full response:', rawData);
        console.log('Number of items:', rawData.length);
        console.log('First item (full):', JSON.stringify(rawData[0], null, 2));
        console.log('First item keys:', Object.keys(rawData[0] || {}));
        
        // Try to find the data structure
        if (rawData.length > 0) {
          const firstItem = rawData[0];
          console.log('=== ANALYZING FIRST ITEM ===');
          console.log('Has text field?', firstItem.text);
          console.log('Has voice field?', firstItem.voice);
          console.log('Has score field?', firstItem.score);
          console.log('Has gpsCoords field?', firstItem.gpsCoords);
          console.log('Has createdAt field?', firstItem.createdAt);
          console.log('Has _id field?', firstItem._id);
          console.log('Has id field?', firstItem.id);
        }
        
        // Process the data for the table
        const processedData = rawData.map((item, index) => {
          // Debug each item
          if (index < 3) { // Only log first 3 items to avoid spam
            console.log(`=== ITEM ${index} ===`);
            console.log('Raw item:', item);
            console.log('text:', item.text);
            console.log('voice:', item.voice);
            console.log('score:', item.score);
            console.log('gpsCoords:', item.gpsCoords);
            console.log('createdAt:', item.createdAt);
          }
          
          return {
            // Keep all original fields
            ...item,
            // Add processed fields for display
            audioPath: item.voice ? `http://localhost:3002/uploads/${item.voice}` : null,
            score: typeof item.score === 'number' ? item.score : (parseFloat(item.score) || 10),
            latitude: item.gpsCoords?.latitude || 0,
            longitude: item.gpsCoords?.longitude || 0,
            caseText: item.text || 'Unknown case',
            id: item._id || item.id || `temp-${index}`,
            // Handle date
            displayDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No date'
          };
        });
        
        console.log('=== PROCESSED DATA ===');
        console.log('Processed data (first 3 items):', processedData.slice(0, 3));
        setData(processedData);
      } catch (error) {
        console.error('Error fetching cases:', error);
        setError('Failed to load emergency cases. Please check if the server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const deleteRow = async (id) => {
    try {
      const response = await fetch(`http://localhost:3002/uploads/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setData(prevData => prevData.filter(item => item.id !== id));
        console.log('Successfully deleted item:', id);
      } else {
        console.error('Failed to delete item');
        alert('Failed to delete the record');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting the record');
    }
  };

  const columns = [
    {
      name: 'Case',
      selector: row => row.caseText,
      sortable: true,
      wrap: true,
    },
    {
      name: 'Voice Record',
      cell: row => (
        row.audioPath ? (
          <audio controls style={{ width: '200px' }}>
            <source src={row.audioPath} type="audio/wav" />
            <source src={row.audioPath} type="audio/webm" />
            <source src={row.audioPath} type="audio/mp3" />
            Your browser does not support the audio element.
          </audio>
        ) : (
          <span style={{ color: '#999' }}>No audio</span>
        )
      ),
      ignoreRowClick: true,
      width: '220px',
    },
    {
      name: 'Latitude',
      selector: row => row.latitude.toFixed(6),
      sortable: true,
      width: '120px',
    },
    {
      name: 'Longitude',
      selector: row => row.longitude.toFixed(6),
      sortable: true,
      width: '120px',
    },
    {
      name: 'Severity',
      selector: row => row.score,
      sortable: true,
      cell: row => (
        <span 
          style={{ 
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: row.score >= 8 ? '#ff4444' : row.score >= 5 ? '#ffaa00' : '#44ff44',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {row.score}
        </span>
      ),
      width: '100px',
    },
    {
      name: 'Date',
      selector: row => row.displayDate,
      sortable: true,
      width: '120px',
    },
    {
      name: 'Actions',
      cell: row => (
        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this record?')) {
              deleteRow(row.id);
            }
          }} 
          className="btn btn-danger btn-sm"
          style={{ padding: '4px 8px' }}
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      ),
      ignoreRowClick: true,
      width: '100px',
    },
  ];

  if (loading) {
    return (
      <div className='container mt-5'>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">Loading emergency cases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mt-5'>
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Data</h4>
          <p>{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='container mt-5'>
      <h2 className="mb-4">Emergency Cases Dashboard</h2>
      
      {data.length === 0 ? (
        <div className="alert alert-info" role="alert">
          <h4 className="alert-heading">No Data Available</h4>
          <p>No emergency cases have been recorded yet. Start by recording an audio emergency report.</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <small className="text-muted">
              Showing {data.length} emergency cases. Check browser console for debug info.
            </small>
          </div>
          
          <DataTable
            columns={columns}
            data={data.sort((a, b) => b.score - a.score)} // Changed from a.score - b.score to b.score - a.score
            defaultSortFieldId={4}
            defaultSortAsc={false} // Changed from true to false to show highest first
            pagination
            paginationPerPage={10}
            paginationRowsPerPageOptions={[5, 10, 15, 20]}
            fixedHeader
            highlightOnHover
            striped
            responsive
          />
          
          {data.some(item => item.latitude !== 0 || item.longitude !== 0) && (
            <div className="mt-4">
              <h3>Emergency Locations</h3>
              <MapComponent 
                locations={data
                  .filter(item => item.latitude !== 0 || item.longitude !== 0)
                  .map(item => ({
                    coordinates: { lat: item.latitude, lng: item.longitude },
                    label: item.caseText,
                    severity: item.score
                  }))} 
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataTablePage;