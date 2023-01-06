import './Expenses.css'
import ExpenseItem from "./ExpenseItem";
import App from '../App'
import './Expenses.css'
import ExpenseFilter from './ExpenseFilter';
import { supabase } from "../supabaseClient";
import { FormEventHandler, useEffect, useState } from 'react';





function Expenses(props) {
  // const items = [
    useEffect(()=>{
      getPeople();
    },[])

    const [people, setPeople] = useState([]);

    async function getPeople(){
    
      try{
        const {data, error} = await supabase
        .from('people')
        .select()
        if (error) throw error;
        if(data != null){
          setPeople(data);
        }
  
      }
      catch(error){
        alert(error.message);
      }
      console.log(people)
    }

    async function deletePerson(){
      try {
        const {data, error} = await supabase
        .from('people')
        .delete()
        .eq('id', people.id)
        .select()
  
        if(error) throw error;
        window.location.reload();
      } catch (error){
    alert(error.message);
      }
    };

  //   {
  //     id: "e1",
  //     title: "Toilet Paper",
  //     amount: 94.12,
  //     date: new Date(2020, 7, 14),
  //   },
  //   { id: "e2", title: "New TV", amount: 799.49, date: new Date(2021, 2, 12) },
  //   {
  //     id: "e3",
  //     title: "Car Insurance",
  //     amount: 294.67,
  //     date: new Date(2021, 2, 28),
  //   },
  //   {
  //     id: "e4",
  //     title: "New Desk (Wooden)",
  //     amount: 450,
  //     date: new Date(2021, 5, 12),
  //   },
  // ];
  // console.log(props.metho[0].title)

return(
    <div className='expenses'>
        <ExpenseFilter/>
    
    {people.map((people)=>(
      <><></><div className='expenses'>

        <ExpenseItem
          title={people.email}
          amount={people.first_name}
          lastName={people.last_name}
          date={people.date} 
          delete={deletePerson}/>
        {/* <ExpenseItem
          title={props.items[1].title}
          amount={props.items[1].amount}
          date={props.items[1].date} />
        <ExpenseItem
          title={props.items[2].title}
          amount={props.items[2].amount}
          date={props.items[2].date} />
        <ExpenseItem
          title={props.items[3].title}
          amount={props.items[3].amount}
          date={props.items[3].date} /> */}
          
      </div></>
  ))}
  </div>
)
}



export default Expenses