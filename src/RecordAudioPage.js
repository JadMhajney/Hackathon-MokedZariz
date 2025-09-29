import React, { useState, useRef, useEffect } from 'react';
import { Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from "react-router-dom";

const RecordAudioPage = () => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const navigate = useNavigate();

  // Get user's location when component mounts
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default coordinates if location access is denied
          setLocation({ latitude: 40.7128, longitude: -74.0060 }); // NYC default
          setGettingLocation(false);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      setLocation({ latitude: 40.7128, longitude: -74.0060 }); // NYC default
      setGettingLocation(false);
    }
  };

  const startRecording = async () => {
    try {
      setRecording(true);
      setUploadStatus(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      // Use webm format for better compatibility
      const options = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      const audioChunks = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        // Stop all tracks to free up the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setUploadStatus({ type: 'error', message: 'Failed to start recording. Please check microphone permissions.' });
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setRecording(false);
      mediaRecorderRef.current.stop();
    }
  };

  const sendAudio = async () => {
    if (!audioBlob) {
      setUploadStatus({ type: 'error', message: 'No audio recorded' });
      return;
    }

    if (location.latitude === null || location.longitude === null) {
      setUploadStatus({ type: 'error', message: 'Location not available' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('voice', audioBlob, 'emergency_audio.webm');
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());

    try {
      const response = await fetch('http://localhost:3002/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload successful:', data);
      
      setUploadStatus({ 
        type: 'success', 
        message: 'Emergency report submitted successfully!',
        data: data
      });

      // Don't auto-redirect, let user choose when to navigate

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: `Upload failed: ${error.message}. Please try again.` 
      });
    } finally {
      setUploading(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioURL('');
    setUploadStatus(null);
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col lg={8} md={10}>
          <div className="text-center">
            <h1 className="mb-4">Emergency Audio Report</h1>
            <p className="text-muted mb-4">
              Record your emergency situation. The system will analyze your audio and categorize the emergency.
            </p>
          </div>

          {/* Location Status */}
          <div className="mb-4 p-3 bg-light rounded">
            <h5>Location Status:</h5>
            {gettingLocation ? (
              <span><Spinner size="sm" /> Getting location...</span>
            ) : location.latitude && location.longitude ? (
              <span className="text-success">
                ✓ Location acquired: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </span>
            ) : (
              <span className="text-warning">⚠ Using default location (location access denied)</span>
            )}
          </div>

          {/* Recording Controls */}
          <div className="text-center mb-4">
            {!recording && !audioBlob && (
              <Button 
                variant="danger" 
                size="lg"
                onClick={startRecording} 
                className="mb-3 px-5 py-3"
                style={{ fontSize: '1.2rem' }}
              >
                <i className="fas fa-microphone me-2"></i>
                Start Emergency Recording
              </Button>
            )}

            {recording && (
              <div>
                <Button 
                  variant="outline-danger" 
                  size="lg"
                  onClick={stopRecording} 
                  className="mb-3 px-5 py-3"
                  style={{ fontSize: '1.2rem' }}
                >
                  <i className="fas fa-stop me-2"></i>
                  Stop Recording
                </Button>
                <div className="mt-2">
                  <span className="text-danger">
                    <i 
                      className="fas fa-circle" 
                      style={{ 
                        animation: 'blink 1s infinite',
                        animationTimingFunction: 'ease-in-out'
                      }}
                    ></i>
                    {' '}Recording in progress...
                  </span>
                </div>
                
                <style>
                  {`
                    @keyframes blink {
                      0%, 50% { opacity: 1; }
                      51%, 100% { opacity: 0.3; }
                    }
                  `}
                </style>
              </div>
            )}
          </div>

          {/* Audio Playback */}
          {audioURL && (
            <div className="mt-4 p-4 border rounded">
              <Alert variant="info">
                <i className="fas fa-check-circle me-2"></i>
                Recording completed! Review your audio below:
              </Alert>
              
              <div className="text-center mb-3">
                <audio controls className="w-100" style={{ maxWidth: '400px' }}>
                  <source src={audioURL} type="audio/webm" />
                  <source src={audioURL} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>

              <div className="d-flex justify-content-center gap-3">
                <Button 
                  variant="success" 
                  onClick={sendAudio}
                  disabled={uploading}
                  className="px-4"
                >
                  {uploading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      Submit Emergency Report
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline-secondary" 
                  onClick={resetRecording}
                  disabled={uploading}
                >
                  <i className="fas fa-redo me-2"></i>
                  Record Again
                </Button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {uploadStatus && (
            <Alert 
              variant={uploadStatus.type === 'error' ? 'danger' : 'success'} 
              className="mt-4"
            >
              <h5 className="alert-heading">
                {uploadStatus.type === 'error' ? 'Error' : 'Success'}
              </h5>
              <p className="mb-0">{uploadStatus.message}</p>
              {uploadStatus.data && (
                <div className="mt-2 small">
                  <strong>Case ID:</strong> {uploadStatus.data.id}<br/>
                  <strong>Analyzed as:</strong> {uploadStatus.data.text}<br/>
                  <strong>Severity:</strong> {uploadStatus.data.score}/10
                </div>
              )}
              {uploadStatus.type === 'success' && (
                <div className="mt-3">
                  <Button 
                    variant="primary" 
                    onClick={() => navigate('/')} 
                    className="me-2"
                  >
                    View All Cases
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    onClick={resetRecording}
                  >
                    Record Another
                  </Button>
                </div>
              )}
            </Alert>
          )}

          {/* Instructions */}
          <div className="mt-5 p-3 bg-light rounded">
            <h6>Instructions:</h6>
            <ul className="mb-0 small">
              <li>Click "Start Emergency Recording" to begin</li>
              <li>Speak clearly and describe your emergency situation</li>
              <li>Click "Stop Recording" when finished</li>
              <li>Review your recording and click "Submit Emergency Report"</li>
              <li>The system will analyze your audio and categorize the emergency</li>
            </ul>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default RecordAudioPage;