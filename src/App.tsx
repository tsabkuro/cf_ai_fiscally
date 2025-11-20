import { useState } from 'react'
import { Container, Navbar, Button, Nav } from 'react-bootstrap'
import './App.css'

function App() {

  return (
    <div className='d-flex flex-column min-vh-100'>
      <Navbar
        bg='white'
        expand='lg'
        className='shadow-sm mb-4'
        style={{ borderBottom: '2px solid #4caf40' }}
      >
        <Container>
          <Navbar.Brand style={{ color: '#4caf40', fontWeight: 'bold', fontSize: '1.5rem' }}>
            Fiscally
          </Navbar.Brand>
        </Container>
      </Navbar>

      <Container>
        
      </Container>
    </div>
  )
}

export default App
