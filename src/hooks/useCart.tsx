import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');//Buscar dados do localStorage

    if (storagedCart) {
      return JSON.parse(storagedCart); //transaformando de volta em array de produtos
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const updatedCart = [...cart]; //novo array com os valores de cart
      const productExists = updatedCart.find(product => product.id === productId)
      //verifica se o id do produto é o mesmo ID do que a função recebe
      //se for igual, existe se não, não existe

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      const currentAmount = productExists ? productExists.amount : 0; //se existe pegar a quantida, se não 0 no carrinho
      const amount = currentAmount + 1;

      //se a quantidade desejada for maior do que a do estoque: erro
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //se o produto existe atualizar a quantidade do produto
      if (productExists) {
        productExists.amount = amount;

      } else {
        const product = await api.get(`/products/${productId}`); //buscar o produto da api

        // como o carrinho espera todos os dados de products mais o amout
        // precisamos criar esse amout
        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct); //atualizando o meu novo array
      }

      setCart(updatedCart); //perpetuar as mudanças no meu carrinho

      //transformar o carrinho em string.
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; //manter a imutabilidade do cart
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw new Error();
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) { //se valor for menor igual a 0 já sai da função
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
