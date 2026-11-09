import {useState} from "react"
import "../styles/AddCar.css";
import logo from '../assets/logo.png';

function AddCar() {
  const[page,setPage]=useState(1);
  return(
<div className="add-car-page">
        <main>
      <div className='heading'>
      <img src={logo} alt="logo" width ="100" height="80"></img>
      <h1>Add a Car</h1>
      </div>
      <form>
        {page===1 &&(
          <div className='card car-info'>
            <h2>Vehicle Details</h2>
            <label className='form-header'>Nickname
            <input type="text" placeholder='e.g.Family Car'/>
            </label>
            <label className='form-header'>Date of Purchase
              <input type="date"/>
            </label>
            <label className='form-header'>Make & Model*
            <input required type="text" placeholder='e.g. Honda Civic'/>
            </label>
            <label className='form-header'>Registration Number*
            <input required type="text" placeholder='YYY-CC-SSSSSS'/>
            </label>
            <div className='navigate'>{page}/4
            <button type="button" onClick={()=>setPage(page+1)}>
            Next</button>
            </div>
            </div>)}
          {page===2 &&(
            <div className='card MotorTax'>
            <h2>Motor Tax</h2>
            <label className='form-header'>Expiry Date
              <input type="date"/>
            </label> 
            <div className='navigate'>
            <button type="button" onClick={()=>setPage(page-1)}>
            Back</button>{page}/4
            <button type="button" onClick={()=>setPage(page+1)}>
            Next</button>
            </div>
            </div>)}
          {page===3 &&(
            <div className='card NCT'>
              <h2>NCT</h2>
              <label className='form-header'>Expiry Date
                <input type="date"/>
              </label>
              <div id='nct_result'>
              <label className='form-header'>Last Test Date
                <input type="date"/>
              </label>
              <input type="checkbox" id="passed" name="nct_result" value="passed" />
              <label htmlFor="passed">Passed</label>
              </div>
            <div className='navigate'>
            <button type="button" onClick={()=>setPage(page-1)}>
            Back</button>{page}/4
            <button type="button" onClick={()=>setPage(page+1)}>
            Next</button>
            </div>
            </div>)}
          {page===4 &&(
            <div className='card Insurance'>
            <h2>Insurance</h2>
            <label className='form-header'>Provider Name
            <input type="text" placeholder='e.g. AXA'/>
            </label>
            <label className='form-header'>Expiry Date
              <input type="date"/>
            </label>
            <div className='navigate'>
            <button type="button" onClick={()=>setPage(page-1)}>
            Back</button>{page}/4
            <button type="button" onClick={()=>setPage(page+1)}>
            Submit</button>
            </div>
            </div>)}
            {page===5 &&(
            <h1>Success! New Car Added!</h1>)}
      </form>
    </main>
    </div>
);
  

}
export default AddCar;
