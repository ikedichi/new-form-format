import React, {useEffect,useState} from 'react'
import  './NewExpense.css'
import { supabase } from '../../supabaseClient';

// import { FormEventHandler, useEffect, useState } from 'react';


const ExpenseForm = (props) => {
    const [first , setEnteredTitle] = useState('');
    const [last, setEnteredAmount] = useState('');
    const [date, setEnteredDate]=useState('');
    const [email, setEmail] = useState('')

    useEffect(()=>{
        createPerson();
      },[])

    async function  createPerson(event){
        event.preventDefault();
        try {
          const {data, error} = await supabase
          .from("people")
          .insert({
            first_name: first,
            last_name: last,
            email: email,
            date: date,
          })
          .single()
          if(error) throw error;
          window.location.reload();
        } catch (error){
      alert(error.message);
        }
      };

    const dateChangeHandler = (event) => {
      setEnteredDate(event.target.value)
    }
    const amountChangeHandler = (event) => {
        setEnteredAmount(event.target.value)
    }
    const titleChangeHandler = (event) => {
            setEnteredTitle(event.target.value)
    }
    const emailChangeHandler = (event) => {
        setEmail(event.target.value)
}
    // const submitHandler = (event) => {
    //     event.preventDefault();

    //     const expenseData = {
    //         title: enteredTitle,
    //         amount: enteredAmount,
    //         date: new Date(enteredDate),
    //     };
    //     props.onSaveExpenseData(expenseData);
    //     setEnteredTitle('');
    //     setEnteredAmount('');
    //     setEnteredDate('');

    // };

    return (
    <form onSubmit={createPerson}>
        <div className = "new-expense__controls">
            <div className = "new-expense__controls">
                <lable>First Name</lable>
                <input type = 'text' onChange={titleChangeHandler} value={first}/>
                </div>
            <div className = "new-expense__controls">
                <lable>Last Name</lable>
                <input type= 'text' 
                onChange={amountChangeHandler} value={last}/>
                </div>
                <div className = "new-expense__controls">
                <lable>Your Email</lable>
                <input type= 'text' 
                onChange={emailChangeHandler} value={email}/>
                </div>
                <div className = "new-expense__controls">
                <lable>Date</lable>
                <input type = 'date' min="2019-01-01" max="2022-12-31"
                onChange={dateChangeHandler} value={date}/>
                </div>

        </div>
        <div className="new-expense__actions">
            <button type='submit'>Submit</button>
        </div>
    </form>
    ); 
};

export default ExpenseForm;