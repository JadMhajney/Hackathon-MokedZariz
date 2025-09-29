const locationsData = [
    {
      id: 1,
      case: 'got shot',
      voiceRecord: '/path/to/audio1.mp3',
      location: 'Tel Aviv, Einstein 19',
      severity: 5,
      reportingTime: '12:30',
      //coordinates: { lat: 31.0001, lng: 34.1111 },
    },
    {
      id: 2,
      case: 'heart attack',
      voiceRecord: '/path/to/audio2.mp3',
      location: 'beer sheva',
      severity: 10,
      reportingTime: '10:05',
      //coordinates: { lat: 32.0853, lng: 34.7818 },
    },
    // Add more cases as needed
  ];

 // Function to fetch data from the server
export async function fetchCases() {
  try {
      const response = await fetch('http://localhost:3002/uploads');
      
      // Check if the request was successful
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json(); // Assuming the response is JSON
      console.log(data); // Display the data in the console or process it as needed
      return data;
      
      // You can use the data here
  } catch (error) {
      console.error('Error fetching data:', error);
  }
}
  
  // export default locationsData;
  