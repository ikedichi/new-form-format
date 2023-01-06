import React, {useState} from 'react';
import './ExpenseItem.css';
import ExpenseDate from './ExpenseDate';
// import Expenses from './Expenses'

const ExpenseItem = (props) => {
    const [title, setTitle] = useState(props.title);
    const [email, setEmail] = useState()
    
   const clickHandler = () => {
       setTitle(<input id="email" placeholder="change email" onChange={(e)=>setEmail(e.target.value)}></input>
       );
       console.log(email);
      
   };
  
  function cancel(){
    setTitle(props.title)
  }

    function deletePerson(){
      props.delet()
    }
     


  return (
    <div className='expense-item'>
      {/* <ExpenseDate date={props.date}>{props.date}</ExpenseDate> */}
      <div className='expense-item__description'>
      <div className='expense-item__price'>{props.amount} {props.lastName}
      </div>
      <div className='expense-item__price'> {title}
      </div>
      <div className='expense-item_price'>
      </div>
      <button onClick={cancel} type = 'button'>
        cancel
      </button>
      <button onClick={deletePerson} type = 'button'>
        delete
      </button>
      <button type = 'buttonn' onClick={clickHandler}>{email? 'change email':'update email'}
      </button>
      <div className='expense-date'>{props.date}</div>
      </div>
     
    </div>

  );
}

export default ExpenseItem;
