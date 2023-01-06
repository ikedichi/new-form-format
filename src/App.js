import ExpenseItem from "./components/ExpenseItem";
import Expenses from "./components/Expenses"
import ExpenseForm from "./components/NewExpense/ExpenseForm";
import NewExpense from './components/NewExpense/NewExpense';
import { supabase } from "./supabaseClient";
import { FormEventHandler, useEffect, useState } from 'react';


// import ExpensesFilter from './components/ExpensesFilter';
function App(props) {
  // const [first, setName] = useState('');
  // const [last, setLast] = useState('');
  // const [email, setEmail] = useState('')
  // const [date, setDate] = useState('');
  // const [metho, setMetho] = useState([]);
  const [people, setPeople] = useState([]);
  // const [editing, setEditing] = useState(false);
  useEffect(()=>{
    getPeople();
  },[])



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

  const Metho = people.map((people2)=>(
    {
        id2: people2.id,
        title2: people2.email,
        amount2: people2.first_name,
        date2: people2.Date,
      }
    
    ))

  // let tit = (metho[0].title)
  

  const expenses = [
    {
      id: "e1",
      title: 'metho.spice(1)',
      amount: 94.12,
      date: new Date(2020, 7, 14),
    },
    { id: "e2", title: "New TV", amount: 799.49, date: new Date(2021, 2, 12) },
    {
      id: "e3",
      title: "Car Insurance",
      amount: 294.67,
      date: new Date(2021, 2, 28),
    },
    {
      id: "e4",
      title: "New Desk (Wooden)",
      amount: 450,
      date: new Date(2021, 5, 12),
    },
  ];

  const addExpenseHandler = (expense) => {
    console.log('in App.js')
    console.log(expense);
  }

   return(
   
   <div>
    {/* <p>{Metho[0].title2}</p> */}
     {/* <ExpensesFilter></ExpensesFilter> */}
      <NewExpense onAddExpense={addExpenseHandler}></NewExpense>
     <Expenses metho={Metho} items={expenses}/>
    
   
     </div>
   )
 
}

export default App;
